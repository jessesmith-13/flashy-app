// src/features/cards/all-cards/components/AllCardsListItem.tsx
import type { UIDeck, UICard } from "@/types/decks";

function cardTypeBadge(cardType: string) {
  if (cardType === "classic-flip")
    return "text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
  if (cardType === "multiple-choice")
    return "text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400";
  return "text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
}

function cardTypeLabel(cardType: string) {
  if (cardType === "classic-flip") return "Classic Flip";
  if (cardType === "multiple-choice") return "Multiple Choice";
  return "Type Answer";
}

export function AllCardsListItem({
  card,
  deckById,
}: {
  card: UICard;
  deckById: Map<string, UIDeck>;
}) {
  const deck = deckById.get(card.deckId);
  const deckName = deck?.name ?? "Unknown Deck";
  const deckEmoji = deck?.emoji ?? "📚";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-lg">{deckEmoji}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {deckName}
        </span>

        <span className={cardTypeBadge(card.cardType)}>
          {cardTypeLabel(card.cardType)}
        </span>
      </div>

      <p className="text-gray-900 dark:text-gray-100 mb-2 font-medium">
        {card.front}
      </p>

      {card.cardType !== "multiple-choice" && (
        <p className="text-emerald-600 dark:text-emerald-400 mb-2">
          {card.back}
        </p>
      )}

      {card.cardType === "multiple-choice" && (
        <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
          {!!card.correctAnswers?.length && (
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                Correct answer{card.correctAnswers.length > 1 ? "s" : ""}:
              </p>
              <ul className="list-disc list-inside text-sm text-emerald-700 dark:text-emerald-300">
                {card.correctAnswers.map((answer, i) => (
                  <li key={i}>{answer}</li>
                ))}
              </ul>
            </div>
          )}

          {!!card.incorrectAnswers?.length && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Incorrect answers:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                {card.incorrectAnswers.map((answer, i) => (
                  <li key={i}>{answer}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {card.cardType === "type-answer" && !!card.acceptedAnswers?.length && (
        <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Accepted answers:
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {card.acceptedAnswers.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
