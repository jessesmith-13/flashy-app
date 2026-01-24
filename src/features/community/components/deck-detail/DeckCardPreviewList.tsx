import { Button } from "@/shared/ui/button";
import { Flag } from "lucide-react";
import { Pagination } from "@/components/Pagination/Pagination";
import { useEffect, useRef } from "react";
import { UICard } from "@/types/decks";

interface DeckCardPreviewListProps {
  cards: UICard[];
  deckId: string;
  currentPage: number;
  cardsPerPage: number;
  flaggedCards: Set<string>;
  targetCardIndex?: number | null;
  isSuperuser?: boolean;
  onPageChange: (page: number) => void;
  onFlagCard: (cardId: string, cardName: string, cardFront: string) => void;
  onDeleteCard?: (cardId: string, cardName: string, deckId: string) => void;
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
  onDeleteCard,
}: DeckCardPreviewListProps) {
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (targetCardIndex !== null && targetCardIndex !== undefined) {
      const targetPage = Math.ceil((targetCardIndex + 1) / cardsPerPage);
      if (targetPage !== currentPage) {
        onPageChange(targetPage);
      } else {
        setTimeout(() => {
          const currentRef = cardRefs.current[targetCardIndex];
          currentRef?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    }
  }, [targetCardIndex, currentPage, cardsPerPage, onPageChange]);

  if (!cards || cards.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md">
        <h2 className="text-xl mb-4 dark:text-gray-100">Cards Preview</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          This deck has no cards.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(cards.length / cardsPerPage);
  const paginatedCards = cards.slice(
    (currentPage - 1) * cardsPerPage,
    currentPage * cardsPerPage,
  );
  const startIndex = (currentPage - 1) * cardsPerPage;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md">
      <h2 className="text-xl mb-4 dark:text-gray-100">Cards Preview</h2>

      <div className="space-y-3">
        {paginatedCards.map((card, index) => {
          const cardIndex = startIndex + index;
          const cardId = `${deckId}-card-${cardIndex}`;
          const isTarget = targetCardIndex === cardIndex;

          return (
            <div
              key={card.id}
              ref={(el) => {
                cardRefs.current[cardIndex] = el;
              }}
              className={`border rounded-lg p-4 transition ${
                isTarget
                  ? "bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex gap-3">
                {/* Index */}
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm">
                  {cardIndex + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Card type badge */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {card.cardType === "classic-flip" && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        Classic Flip
                      </span>
                    )}
                    {card.cardType === "multiple-choice" && (
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                        Multiple Choice
                      </span>
                    )}
                    {card.cardType === "type-answer" && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        Type Answer
                      </span>
                    )}

                    {flaggedCards.has(cardId) && (
                      <span className="text-xs px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-700">
                        <Flag className="w-3 h-3 inline mr-1" />
                        Marked
                      </span>
                    )}
                  </div>

                  {/* FRONT */}
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 break-words">
                    {card.front}
                  </p>

                  {/* BACK (not for multiple-choice) */}
                  {card.cardType !== "multiple-choice" && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-2 break-words">
                      {card.back}
                    </p>
                  )}

                  {/* MULTIPLE CHOICE */}
                  {card.cardType === "multiple-choice" && (
                    <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
                      {card.correctAnswers?.length ? (
                        <div>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                            Correct answer
                            {card.correctAnswers.length > 1 ? "s" : ""}:
                          </p>
                          <ul className="list-disc list-inside text-xs text-emerald-700 dark:text-emerald-300">
                            {card.correctAnswers.map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {card.incorrectAnswers?.length ? (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Incorrect options:
                          </p>
                          <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-400">
                            {card.incorrectAnswers.map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* TYPE ANSWER */}
                  {card.cardType === "type-answer" &&
                    card.acceptedAnswers?.length && (
                      <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Accepted answers:
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {card.acceptedAnswers.join(", ")}
                        </p>
                      </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      onFlagCard(
                        cardId,
                        `Card ${cardIndex + 1}`,
                        card.front || "",
                      )
                    }
                    className="text-orange-600 dark:text-orange-400"
                  >
                    <Flag className="w-4 h-4" />
                  </Button>

                  {isSuperuser && onDeleteCard && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        onDeleteCard(card.id, `Card ${cardIndex + 1}`, deckId)
                      }
                      className="text-red-600 dark:text-red-400"
                    >
                      🗑️
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        scrollToTop={false}
      />
    </div>
  );
}
