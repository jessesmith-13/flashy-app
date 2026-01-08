import { AppLayout } from '../Layout/AppLayout'
import { Button } from '../../ui/button'
import { ArrowLeft, Play } from 'lucide-react'
import { Deck } from '../../types/decks'

type CardType = 'classic-flip' | 'multiple-choice' | 'type-answer'

interface ViewerCard {
  id: string
  position?: number
  cardType: CardType
  front: string
  back: string
  correctAnswers?: string[] | null
  incorrectAnswers?: string[] | null
  acceptedAnswers?: string[] | null
  frontImageUrl?: string | null
  backImageUrl?: string | null
}

interface UserDeckViewerProps {
  deck: {
    id: string
    name: string
    emoji: string
    color: string
    category?: string | null
    subtopic?: string | null
    owner_id: string
    is_public: boolean
    created_at: string,
    updated_at: string,
    card_count: number,
    difficulty?: string | null,
    is_published?: boolean,
  }
  cards: ViewerCard[]
  ownerId: string
  isOwner: boolean
  onBack: () => void
  onStudy: (deck: Deck, cards: ViewerCard[]) => void
}

export function UserDeckViewer({
  deck,
  cards,
  isOwner,
  onBack,
  onStudy
}: UserDeckViewerProps) {
  const sortedCards = [...cards].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  )

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
                <h1 className="text-2xl sm:text-3xl text-gray-900 dark:text-gray-100 mb-2">
                  {deck.name}
                </h1>
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
                  onClick={() => onStudy({
                    ...deck,
                    updated_at: deck.created_at,
                    card_count: cards.length,
                    difficulty: 'mixed',
                    is_published: false
                  } as Deck, cards)}
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
                  You're viewing this deck in read-only mode. You can study it, but cannot edit it.
                </p>
              </div>
            )}
          </div>

          {/* Cards List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl text-gray-900 dark:text-gray-100 mb-6">
              Cards ({sortedCards.length})
            </h2>

            {sortedCards.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                  No cards in this deck yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedCards.map((card, index) => (
                  <div
                    key={card.id}
                    className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-sm">
                        {index + 1}
                      </span>

                      <div className="flex-1 min-w-0 space-y-4">
                        {/* FRONT */}
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Front
                          </p>
                          {card.frontImageUrl ? (
                            <img
                              src={card.frontImageUrl}
                              alt="Card front"
                              className="w-full max-w-sm rounded-lg border"
                            />
                          ) : (
                            <p className="text-gray-900 dark:text-gray-100">
                              {card.front}
                            </p>
                          )}
                        </div>

                        {/* BACK */}
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Back
                          </p>

                          {/* MULTIPLE CHOICE */}
                          {card.cardType === 'multiple-choice' ? (
                            <div className="space-y-2">
                              {card.correctAnswers?.map((answer, i) => (
                                <p
                                  key={`correct-${i}`}
                                  className="text-emerald-600 dark:text-emerald-400 font-medium"
                                >
                                  ✓ {answer}
                                </p>
                              ))}

                              {card.incorrectAnswers?.map((answer, i) => (
                                <p
                                  key={`incorrect-${i}`}
                                  className="text-gray-600 dark:text-gray-400"
                                >
                                  • {answer}
                                </p>
                              ))}
                            </div>
                          ) : card.backImageUrl ? (
                            <img
                              src={card.backImageUrl}
                              alt="Card back"
                              className="w-full max-w-sm rounded-lg border"
                            />
                          ) : (
                            <p className="text-gray-900 dark:text-gray-100">
                              {card.back}
                            </p>
                          )}
                        </div>

                        {/* TYPE ANSWER */}
                        {card.cardType === 'type-answer' &&
                          card.acceptedAnswers?.length ? (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Accepted answers
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {card.acceptedAnswers.join(', ')}
                              </p>
                            </div>
                          ) : null}
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