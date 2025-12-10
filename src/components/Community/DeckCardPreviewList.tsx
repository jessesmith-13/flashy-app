import { Button } from '../../ui/button'
import { Flag } from 'lucide-react'
import { Pagination } from '../Pagination/Pagination'
import { useEffect, useRef } from 'react'

interface DeckCardPreviewListProps {
  cards: any[]
  deckId: string
  currentPage: number
  cardsPerPage: number
  flaggedCards: Set<string>
  targetCardIndex?: number | null
  isSuperuser?: boolean
  onPageChange: (page: number) => void
  onFlagCard: (cardId: string, cardName: string, cardFront: string) => void
  onDeleteCard?: (cardId: string, cardName: string, deckId: string) => void
}

export function DeckCardPreviewList({
  cards,
  deckId,
  currentPage,
  cardsPerPage,
  flaggedCards,
  targetCardIndex,
  isSuperuser = false,
  onPageChange,
  onFlagCard,
  onDeleteCard
}: DeckCardPreviewListProps) {
  const cardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  useEffect(() => {
    if (targetCardIndex !== null && targetCardIndex !== undefined) {
      const targetPage = Math.ceil((targetCardIndex + 1) / cardsPerPage)
      if (targetPage !== currentPage) {
        onPageChange(targetPage)
      } else {
        // Use setTimeout to ensure DOM is updated after pagination
        setTimeout(() => {
          const currentRef = cardRefs.current[targetCardIndex]
          if (currentRef) {
            currentRef.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 300)
      }
    }
  }, [targetCardIndex, currentPage, cardsPerPage, onPageChange])

  if (!cards || cards.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-md mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl mb-3 sm:mb-4 dark:text-gray-100">Cards Preview</h2>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            This deck appears to have no cards available.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            The deck may have been published with cards that were later removed, or there may be a data issue.
          </p>
        </div>
      </div>
    )
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
        {paginatedCards.map((card: any, index: number) => {
          const cardIndex = startIndex + index
          const cardId = `${deckId}-card-${cardIndex}`
          const isTarget = targetCardIndex === cardIndex
          return (
            <div
              key={index}
              className={`border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-500 ${isTarget ? 'bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500 dark:ring-emerald-400' : ''}`}
              ref={(el) => (cardRefs.current[cardIndex] = el)}
            >
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
                  onClick={() => onFlagCard(cardId, `Card ${startIndex + index + 1}`, card.front)}
                  className="text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                  title="Report this card"
                >
                  <Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
                {isSuperuser && onDeleteCard && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteCard(card.id, `Card ${startIndex + index + 1}: ${card.front.substring(0, 30)}...`, deckId)}
                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                    title="Delete this card"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                )}
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