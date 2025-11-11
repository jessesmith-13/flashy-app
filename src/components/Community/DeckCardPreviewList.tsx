import { Button } from '../../ui/button'
import { Flag } from 'lucide-react'
import { Pagination } from '../Pagination/Pagination'
import { Card } from '../../../store/useStore'

interface DeckCardPreviewListProps {
  cards: Card[]
  deckId: string
  currentPage: number
  cardsPerPage: number
  flaggedCards: Set<string>
  onPageChange: (page: number) => void
  onFlagCard: (cardId: string, cardName: string) => void
}

export function DeckCardPreviewList({
  cards,
  deckId,
  currentPage,
  cardsPerPage,
  flaggedCards,
  onPageChange,
  onFlagCard
}: DeckCardPreviewListProps) {
  if (!cards || cards.length === 0) {
    return null
  }

  const totalCardPages = Math.ceil(cards.length / cardsPerPage)
  const paginatedCards = cards.slice(
    (currentPage - 1) * cardsPerPage,
    currentPage * cardsPerPage
  )
  const startIndex = (currentPage - 1) * cardsPerPage

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-md mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl mb-3 sm:mb-4 dark:text-gray-100">Cards Preview</h2>
      <div className="space-y-3">
        {paginatedCards.map((card: Card, index: number) => {
          const cardId = `${deckId}-card-${startIndex + index}`
          return (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 text-xs sm:text-sm">
                  {startIndex + index + 1}
                </div>
                <div className="flex-1 min-w-0 break-words">
                  {/* Card type badge and flag indicator */}
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    {card.cardType === 'classic-flip' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        Classic Flip
                      </span>
                    )}
                    {card.cardType === 'multiple-choice' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                        Multiple Choice
                      </span>
                    )}
                    {card.cardType === 'type-answer' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        Type Answer
                      </span>
                    )}
                    {flaggedCards.has(cardId) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-700">
                        <Flag className="w-3 h-3 mr-1" />
                        Marked for Review
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm sm:text-base text-gray-700 mb-2 break-words dark:text-gray-300">{card.front}</p>
                  <p className="text-sm sm:text-base text-emerald-600 mb-2 break-words dark:text-emerald-400">{card.back}</p>
                  
                  {/* Show options for multiple choice */}
                  {card.cardType === 'multiple-choice' && card.options && (
                    <div className="mt-2 pl-3 sm:pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Other options:</p>
                      <div className="space-y-1">
                        {card.options.map((option: string, idx: number) => (
                          <p key={idx} className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">• {option}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show accepted answers for type-answer */}
                  {card.cardType === 'type-answer' && card.acceptedAnswers && card.acceptedAnswers.length > 0 && (
                    <div className="mt-2 pl-3 sm:pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Accepted answers:</p>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">{card.acceptedAnswers.join(', ')}</p>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFlagCard(cardId, `Card ${startIndex + index + 1}`)}
                  className="text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                  title="Report this card"
                >
                  <Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalCardPages}
        onPageChange={onPageChange}
        scrollToTop={false}
      />
    </div>
  )
}
