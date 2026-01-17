import { Button } from "@/shared/ui/button";
import { Play } from "lucide-react";
import type { UIDeck, UICard } from "@/types/decks";
import { AllCardsListItem } from "./AllCardsListItem";

export function AllCardsList({
  loading,
  cards,
  totalCards,
  searchQuery,
  deckById,
  onStudyAll,
}: {
  loading: boolean;
  cards: UICard[];
  totalCards: number;
  searchQuery: string;
  deckById: Map<string, UIDeck>;
  onStudyAll: () => void;
}) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        <p className="text-gray-500 dark:text-gray-400 mt-4">
          Loading cards...
        </p>
      </div>
    );
  }

  return (
    <>
      {totalCards > 0 && (
        <div className="mb-6">
          <Button
            onClick={onStudyAll}
            className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
          >
            <Play className="w-4 h-4 mr-2" />
            Study All Cards ({totalCards})
          </Button>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery ? "No cards match your search" : "No cards yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <AllCardsListItem key={card.id} card={card} deckById={deckById} />
          ))}
        </div>
      )}
    </>
  );
}
